import Menu from "@/components/Menu";
import Window from "@/components/Window";

export default function About() {
  return (
    <div className="flex flex-col items-center justify-center p-4 sm:p-0 sm:w-xl w-full">
      <Menu page="about" />
      <Window title="about finagotchi" isOpen={true}>
        <div className="flex flex-col gap-2 p-4">
          <p className="text-2xl">finagotchi</p>
          <p>
            finagotchi is a memory-aware finance operations agent disguised as a
            virtual pet. raise your agent by guiding it through real-world
            financial scenarios — invoice reviews, expense audits, vendor risk
            assessments, and compliance checks.
          </p>
          <p>
            every decision you make shapes your agent&apos;s personality: will it
            become a vigilant auditor, a pragmatic risk-taker, or a meticulous
            penny pincher? your choices are remembered and influence how the
            agent evolves.
          </p>
          <p className="text-zinc-500">
            powered by local LLMs, vector memory (Qdrant), and a knowledge graph
            (Kuzu). built for hackathon vibes.
          </p>
        </div>
      </Window>
    </div>
  );
}
