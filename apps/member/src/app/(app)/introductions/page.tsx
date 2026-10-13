import { redirect } from "next/navigation";

export default function IntroductionsRedirect() {
  redirect("/members?tab=received");
}
