import { useState } from "react";

export default function PasswordInput({
  value,
  onChange,
  placeholder = "Password",
  required = false,
}) {
  const [show, setShow] = useState(false);

  return (
    <div className="relative">
      <input
        type={show ? "text" : "password"}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-3 pr-14 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
      />

      <button
        type="button"
        onClick={() => setShow(!show)}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-sm"
      >
        {show ? "Hide" : "Show"}
      </button>
    </div>
  );
}
