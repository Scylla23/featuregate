import { useState } from 'react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Globe, Key, Users, Settings } from 'lucide-react';
import { EnvironmentsTab } from './environments-tab';
import { ApiKeysTab } from './api-keys-tab';
import { TeamTab } from './team-tab';
import { ProjectTab } from './project-tab';

export function SettingsPage() {
  const [activeTab, setActiveTab] = useState('environments');

  return (
    <div className="flex h-full flex-col">
      <div className="border-b px-6 pt-4">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="h-9">
            <TabsTrigger value="environments" className="gap-1.5">
              <Globe className="size-3.5" />
              Environments
            </TabsTrigger>
            <TabsTrigger value="api-keys" className="gap-1.5">
              <Key className="size-3.5" />
              API Keys
            </TabsTrigger>
            <TabsTrigger value="team" className="gap-1.5">
              <Users className="size-3.5" />
              Team
            </TabsTrigger>
            <TabsTrigger value="project" className="gap-1.5">
              <Settings className="size-3.5" />
              Project
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <div className="flex-1 overflow-auto">
        {activeTab === 'environments' && <EnvironmentsTab />}
        {activeTab === 'api-keys' && <ApiKeysTab />}
        {activeTab === 'team' && <TeamTab />}
        {activeTab === 'project' && <ProjectTab />}
      </div>
    </div>
  );
}
