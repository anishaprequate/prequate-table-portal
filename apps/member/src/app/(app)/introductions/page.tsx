import { redirect } from "next/navigation";

export default function IntroductionsRedirect() {
  redirect("/directory?tab=received");
}
