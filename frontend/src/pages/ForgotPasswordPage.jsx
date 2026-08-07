import { useState } from "react";
import { Link } from "react-router-dom";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();

    // Placeholder for future backend endpoint
    console.log("Reset requested for:", email);

    setSubmitted(true);
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-8 space-y-5">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-white">Forgot password</h1>
          <p className="text-slate-400">
            Enter your email and we'll send you a reset link.
          </p>
        </div>

        {submitted ? (
          <div className="bg-green-500/10 border border-green-500/30 text-green-300 rounded-lg p-4 text-sm">
            If an account exists for <strong>{email}</strong>, a password reset
            link has been sent.
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <input
              type="email"
              placeholder="Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              required
            />

            <button
              type="submit"
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg py-3 font-medium transition-colors"
            >
              Send reset link
            </button>
          </form>
        )}

        <p className="text-center text-sm text-slate-400">
          Remember your password?{" "}
          <Link to="/login" className="text-indigo-400 hover:text-indigo-300">
            Back to login
          </Link>
        </p>
      </div>
    </div>
  );
}
