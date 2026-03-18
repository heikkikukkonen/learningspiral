import { redirect } from "next/navigation";
import { StoryExperience } from "./story/story-experience";
import { getCurrentUser } from "@/lib/auth";

export default async function HomePage() {
  const user = await getCurrentUser();

  if (user) {
    redirect("/app");
  }

  return <StoryExperience mode="landing" />;
}
