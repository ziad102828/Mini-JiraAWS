import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth.js';
import { enforceTeamIsolation, validateTaskAccess } from '../middleware/teamIsolation.js';
import * as taskService from '../services/taskService.js';
import * as auditService from '../services/auditService.js';
import * as notificationService from '../services/notificationService.js';

const router = Router();

// All task routes require authentication
router.use(authenticate);

/**
 * GET /api/tasks
 * List tasks. Employees see only their team's tasks (enforced by middleware).
 * Managers can optionally filter by teamId or see all.
 * Query params: ?teamId=xxx&status=xxx&assigneeId=xxx
 */
router.get('/', enforceTeamIsolation, async (req, res, next) => {
  try {
    const { teamId, status, assigneeId } = req.query;
    let tasks;

    if (assigneeId) {
      tasks = await taskService.getTasksByAssignee(assigneeId);
    } else if (teamId) {
      tasks = await taskService.getTasksByTeam(teamId);
    } else {
      // Manager with no filter — get all tasks
      tasks = await taskService.getAllTasks();
    }

    // Optional status filter (applied in-memory after DynamoDB query)
    if (status) {
      tasks = tasks.filter((t) => t.status === status);
    }

    res.json({ tasks, count: tasks.length });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/tasks/:taskId
 * Get a single task by ID. Team isolation enforced.
 */
router.get('/:taskId', async (req, res, next) => {
  try {
    const task = await taskService.getTaskById(req.params.taskId);
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    // Attach task for team isolation check
    req.task = task;
    validateTaskAccess(req, res, () => {
      res.json({ task });
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/tasks
 * Create a new task. Only managers can create tasks.
 * Body: { title, description, priority, deadline, assigneeId, teamId, projectId }
 */
router.post('/', requireRole('manager', 'admin'), async (req, res, next) => {
  try {
    const task = await taskService.createTask({
      ...req.body,
      createdBy: req.user.userId,
    });

    // Publish assignment notification via SNS
    if (task.assigneeId) {
      await notificationService.publishTaskAssignment(task);
    }

    res.status(201).json({ task });
  } catch (err) {
    next(err);
  }
});

/**
 * PUT /api/tasks/:taskId
 * Update a task. Managers can update anything.
 * Employees can only update status of tasks assigned to their team.
 */
router.put('/:taskId', enforceTeamIsolation, async (req, res, next) => {
  try {
    const existingTask = await taskService.getTaskById(req.params.taskId);
    if (!existingTask) {
      return res.status(404).json({ error: 'Task not found' });
    }

    // Team isolation check for employees
    req.task = existingTask;
    validateTaskAccess(req, res, async () => {
      try {
        // Employees can only update status
        let updateData = req.body;
        if (req.user.role === 'employee') {
          updateData = { status: req.body.status };
        }

        const updatedTask = await taskService.updateTask(req.params.taskId, updateData);

        // Log status changes in audit trail
        if (req.body.status && req.body.status !== existingTask.status) {
          await auditService.logStatusChange({
            taskId: req.params.taskId,
            actorId: req.user.userId,
            fromStatus: existingTask.status,
            toStatus: req.body.status,
          });
        }

        res.json({ task: updatedTask });
      } catch (innerErr) {
        next(innerErr);
      }
    });
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /api/tasks/:taskId
 * Delete a task. Only managers can delete.
 */
router.delete('/:taskId', requireRole('manager', 'admin'), async (req, res, next) => {
  try {
    await taskService.deleteTask(req.params.taskId);
    res.json({ message: 'Task deleted successfully' });
  } catch (err) {
    next(err);
  }
});

export default router;
