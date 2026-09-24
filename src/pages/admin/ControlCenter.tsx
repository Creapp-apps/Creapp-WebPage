import React from 'react';
import { useNavigate } from 'react-router-dom';
import AdminLayout, { AdminTab } from '@/components/admin/AdminLayout';
import ProjectsTab from '@/components/admin/ProjectsTab';

const ControlCenter: React.FC = () => {
  const navigate = useNavigate();

  const handleTabChange = (tab: AdminTab) => {
    if (tab === 'projects') return;
    navigate(`/admin?tab=${tab}`);
  };

  return (
    <AdminLayout
      currentTab="projects"
      onTabChange={handleTabChange}
      onCreateProposalClick={() => navigate('/admin/propuesta/nueva?type=project')}
      onCreateLeadClick={() => navigate('/admin?tab=pipeline')}
    >
      <ProjectsTab />
    </AdminLayout>
  );
};

export default ControlCenter;
