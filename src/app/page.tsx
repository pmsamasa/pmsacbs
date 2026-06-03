import { redirect } from "next/navigation";
import { roleHome } from "@/lib/data";

export default async function Home() {
  redirect(await roleHome());
}

