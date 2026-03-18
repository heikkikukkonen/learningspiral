import type { Metadata } from "next";
import { StoryExperience } from "./story-experience";

export const metadata: Metadata = {
  title: "Noeman tarina",
  description: "Visuaalinen scroll story Noemasta: ajattelusta, joka syvenee."
};

export default function StoryPage() {
  return <StoryExperience />;
}
