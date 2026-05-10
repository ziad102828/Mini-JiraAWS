import MainLayout from '../components/layout/MainLayout';
import { FolderKanban } from 'lucide-react';

export default function ProjectsPage() {
  return (
    <MainLayout>
      <div className="max-w-4xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white">Projects</h1>
          <p className="text-gray-400 mt-1">Manage and track all company projects</p>
        </div>
        <div className="text-center py-20 bg-white/[0.02] border border-dashed border-white/10 rounded-2xl">
          <FolderKanban size={48} className="mx-auto text-gray-600 mb-4" />
          <p className="text-gray-300 font-semibold text-lg">Projects Coming Soon</p>
          <p className="text-gray-500 text-sm mt-2">This section will show all active projects across teams.</p>
        </div>
      </div>
    </MainLayout>
  );
}
