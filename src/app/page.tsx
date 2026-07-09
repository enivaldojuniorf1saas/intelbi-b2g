import { redirect } from "next/navigation";

export default function Home() {
  // Isso apenas joga o usuário para a tela de login
  redirect("/login");
}