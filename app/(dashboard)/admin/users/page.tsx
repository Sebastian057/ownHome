import { redirect } from "next/navigation";

// Zarządzanie użytkownikami przeniesione do /settings → tab "Użytkownicy"
export default function AdminUsersRoute() {
  redirect("/settings");
}
