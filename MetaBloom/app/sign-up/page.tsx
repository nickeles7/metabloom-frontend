"use client";
import { useEffect } from "react";

// Redirect to homepage since we don't want to use this page
export default function SignUp() {
  useEffect(() => {
    window.location.href = "/";
  }, []);
  
  return null;
}
