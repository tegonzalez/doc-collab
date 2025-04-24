import { ProjectExplorer } from '@/components/ProjectExplorer';
import { Toaster } from '@/components/ui/toaster';

export default function Home() {
  return (
    <>
      <ProjectExplorer />
      <Toaster />
    </>
  );
}
