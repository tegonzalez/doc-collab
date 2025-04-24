import {ProjectExplorer} from '@/components/ProjectExplorer';
import {SidebarProvider} from '@/components/ui/sidebar';
import {Toaster} from '@/components/ui/toaster';

export default function Home() {
  return (
    <>
      <SidebarProvider>
        <ProjectExplorer />
      </SidebarProvider>
      <Toaster />
    </>
  );
}
