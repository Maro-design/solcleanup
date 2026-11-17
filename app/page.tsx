import { Nav } from "@/components/site/Nav";
import { Footer } from "@/components/site/Footer";
import { Hero } from "@/components/landing/Hero";

/** Home: one message, one action. Each topic has its own page. */
export default function Home() {
  return (
    <>
      <Nav />
      <main id="main">
        <Hero />
      </main>
      <Footer />
    </>
  );
}
