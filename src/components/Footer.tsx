import { Trophy, Heart } from "lucide-react";
import Link from "next/link";

/** Site-wide footer with branding, platform links, and impact badge. */
export default function Footer() {
  return (
    <footer className="bg-foreground text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="md:col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                <Trophy className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold">
                Golf<span className="text-primary-light">Give</span>
              </span>
            </div>
            <p className="text-gray-400 text-sm max-w-md">
              Play golf, win prizes, and make a difference. Every subscription
              contributes to charity while giving you a chance to win monthly
              prize pools.
            </p>
          </div>

          <div>
            <h3 className="font-semibold mb-3">Platform</h3>
            <ul className="space-y-2 text-sm text-gray-400">
              <li>
                <Link href="/charities" className="hover:text-white transition-colors">
                  Browse Charities
                </Link>
              </li>
              <li>
                <Link href="/signup" className="hover:text-white transition-colors">
                  Get Started
                </Link>
              </li>
              <li>
                <Link href="/login" className="hover:text-white transition-colors">
                  Login
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold mb-3">Impact</h3>
            <ul className="space-y-2 text-sm text-gray-400">
              <li className="flex items-center gap-1.5">
                <Heart className="w-3.5 h-3.5 text-primary-light" />
                Supporting charities worldwide
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-white/10 mt-8 pt-8 text-center text-sm text-gray-500">
          &copy; 2026 GolfGive. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
