import Image from "next/image";
import { auth0, isAuth0Configured } from "@/lib/auth0";
import SyllabusForm from "@/components/syllabus-form";

export default async function Home() {
  const session = isAuth0Configured ? await auth0.getSession() : null;

  return (
    <main>
      <section aria-label="Survive the Swamp home" className="landing-scene">
        <div className="landing-artboard">
          <Image
            alt=""
            className="landing-background"
            fill
            priority
            sizes="100vw"
            src="/artwork/swamp-background-original.png"
          />
          <div
            aria-label="Survive the Swamp alligator logo. Hover or focus to make it chomp."
            className="gator-interaction"
            role="img"
            tabIndex={0}
          >
            <Image
              alt=""
              className="gator-art gator-art-open"
              fill
              sizes="68vw"
              src="/artwork/gator-open-clean.png"
            />
            <Image
              alt=""
              className="gator-art gator-art-closed"
              fill
              sizes="68vw"
              src="/artwork/gator-closed-clean.png"
            />
            <span aria-hidden="true" className="gator-title">
              Survive the Swamp
            </span>
          </div>
          <a
            href={
              session
                ? "/syllabus"
                : "/auth/login?screen_hint=signup&returnTo=/syllabus"
            }
            aria-label={
              session ? "Open my syllabus" : "Sign up"
            }
            className="login-artwork"
          >
            <Image
              alt=""
              fill
              sizes="50vw"
              src="/artwork/login-cloud-clean.png"
            />
            <span aria-hidden="true" className="login-artwork-label">
              {session ? "Open My Syllabus" : "Log in / Sign up"}
            </span>
          </a>
        </div>
      </section>

    </main>
  );
}
