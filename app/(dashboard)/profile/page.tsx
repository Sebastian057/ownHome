import { redirect } from "next/navigation";

// Profil przeniesiony do /settings → tab "Profil"
export default function ProfilePage() {
  redirect("/settings");
}
