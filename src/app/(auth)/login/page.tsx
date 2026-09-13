"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { Mail, Lock, AlertCircle, ArrowRight, Layers } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setIsLoading(true);

    try {
      const res = await signIn("credentials", {
        redirect: false,
        email,
        password,
      });

      if (res?.error) {
        setErrorMsg("Invalid email or password");
      } else {
        router.push("/");
        router.refresh();
      }
    } catch {
      setErrorMsg("An error occurred during sign in");
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
            Sign in to SplitStream
          </h2>
          <p className="text-[11px] text-[var(--ink-secondary)] mt-1">
            Access your 2-stem jobs, media assets, and studio history.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
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
            Sign In <ArrowRight className="w-3.5 h-3.5 ml-1 stroke-[1.5]" />
          </Button>
        </form>

        <div className="mt-6 pt-4 border-t border-[var(--line)] text-center text-[11px] text-[var(--ink-secondary)]">
          Don&apos;t have an account?{" "}
          <Link href="/signup" className="text-[var(--ink-primary)] font-bold underline hover:no-underline">
            Create account
          </Link>
        </div>
      </Card>
    </div>
  );
}
