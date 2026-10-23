import { Dashboard } from "@/components/Dashboard";
import { CursorGlow, Footer, Hero, Nav, Pipeline, Rules, SourceMarquee } from "@/components/Landing";

export default function Home() {
  return (
    <>
      <CursorGlow />
      <div className="relative z-10">
        <Nav />
        <Hero />
        <SourceMarquee />
        <Pipeline />
        <Rules />
        <Dashboard />
        <Footer />
      </div>
    </>
  );
}
