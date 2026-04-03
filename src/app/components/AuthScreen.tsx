import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { Label } from "./ui/label";
import { useAuth } from "../contexts/AuthContext";

export function AuthScreen() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const result = await signIn(email.trim(), password);
    if (result.error) setError(result.error);
    setSubmitting(false);
  }

  return (
    <div className="min-h-screen grid place-items-center bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 p-6">
      <Card className="w-full max-w-md border-emerald-200">
        <CardHeader>
          <CardTitle>Sign in to Mindful OS</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                minLength={6}
                required
              />
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <Button className="w-full" disabled={submitting}>
              {submitting ? "Please wait..." : "Sign in"}
            </Button>
            <p className="text-xs text-gray-500">
              Sign-up is disabled for this site. Ask the admin to create your account.
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

