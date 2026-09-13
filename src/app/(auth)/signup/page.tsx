"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { Mail, Lock, User, AlertCircle, ArrowRight, Layers } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

export default function SignUpPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setIsLoading(true);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Registration failed");
      }

      // Auto sign in
      const signInRes = await signIn("credentials", {
        redirect: false,
        email,
        password,
      });

      if (signInRes?.error) {
        router.push("/login");
      } else {
        router.push("/");
        router.refresh();
      }
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Failed to create account");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[75vh] flex items-center justify-center py-12 px-4 font-mono">
      <Card className="w-full max-w-sm p-6 sm:p-8">
        <div className="text-center mb-6">
          <div className="w-10 h-10 border border-[var(--line)] bg-[var(--bg-secondary)] mx-auto flex items-center justify-center text-[var(--ink-primary)] mb-3">
            <Layers className="w-5 h-5 stroke-[1.5]" />
          </div>
          <h2 className="text-base font-bold uppercase tracking-tight text-[var(--ink-primary)]">
            Create Account
          </h2>
          <p className="text-[11px] text-[var(--ink-secondary)] mt-1">
            Studio-grade 2-stem AI separation and audio DSP suite.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Input
            label="Full Name"
            type="text"
            placeholder="Jane Doe"
            value={name}
            onChange={(e) => setName(e.target.value)}
            leftIcon={<User className="w-3.5 h-3.5 text-[var(--ink-secondary)]" />}
            required
          />

          <Input
            label="Email Address"
            type="email"
            placeholder="name@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            leftIcon={<Mail className="w-3.5 h-3.5 text-[var(--ink-secondary)]" />}
            required
          />

          <Input
            label="Password"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            leftIcon={<Lock className="w-3.5 h-3.5 text-[var(--ink-secondary)]" />}
            required
          />

          {errorMsg && (
            <div className="p-3 border border-[var(--line)] bg-[var(--bg-secondary)] text-xs text-[var(--ink-primary)] flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 stroke-[1.5]" />
              <span>{errorMsg}</span>
            </div>
          )}

          <Button type="submit" size="lg" isLoading={isLoading} className="w-full mt-1">
            Register <ArrowRight className="w-3.5 h-3.5 ml-1 stroke-[1.5]" />
          </Button>
        </form>

        <div className="mt-6 pt-4 border-t border-[var(--line)] text-center text-[11px] text-[var(--ink-secondary)]">
          Already have an account?{" "}
          <Link href="/login" className="text-[var(--ink-primary)] font-bold underline hover:no-underline">
            Sign In
          </Link>
        </div>
      </Card>
    </div>
  );
}
