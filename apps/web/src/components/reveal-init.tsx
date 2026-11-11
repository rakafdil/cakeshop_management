
"use client";

import { useEffect } from "react";

export default function RevealInit() {
  useEffect(() => {
    const root = document.documentElement;

    root.classList.add("js-reveal");

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          entry.target.classList.toggle("in", entry.isIntersecting);
        });
      },
      { threshold: 0.15 },
    );

    document.querySelectorAll(".reveal").forEach((el) => {
      io.observe(el);
    });

    return () => {
      io.disconnect();
      root.classList.remove("js-reveal");
    };
  }, []);

  return null;
}
