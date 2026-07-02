"use client";

import { redirect } from "next/navigation";

export default function RegisterPage() {
    redirect("/auth/login?mode=register");
}
