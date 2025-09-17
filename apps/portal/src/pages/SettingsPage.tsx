import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { useState } from "react";

const SettingsPage = () => {
  const [activeTab, setActiveTab] = useState('Profile');

  return (
    <div className="flex">
      <div className="w-1/4">
        <Card>
          <CardContent className="p-4">
            <nav className="space-y-2">
              <button onClick={() => setActiveTab('Profile')} className={`w-full text-left px-3 py-2 rounded ${activeTab === 'Profile' ? 'bg-blue-500 text-white' : ''}`}>Profile</button>
              <button onClick={() => setActiveTab('Security')} className={`w-full text-left px-3 py-2 rounded ${activeTab === 'Security' ? 'bg-blue-500 text-white' : ''}`}>Security</button>
              <button onClick={() => setActiveTab('Notifications')} className={`w-full text-left px-3 py-2 rounded ${activeTab === 'Notifications' ? 'bg-blue-500 text-white' : ''}`}>Notifications</button>
            </nav>
          </CardContent>
        </Card>
      </div>
      <div className="w-3/4 pl-4">
        <Card>
          <CardHeader>
            <CardTitle>{activeTab}</CardTitle>
          </CardHeader>
          <CardContent>
            {activeTab === 'Profile' && <div>Profile Settings Content</div>}
            {activeTab === 'Security' && <div>Security Settings Content</div>}
            {activeTab === 'Notifications' && <div>Notifications Settings Content</div>}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SettingsPage;
