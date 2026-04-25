import { useState } from "react";
import { Copy, Check, Linkedin, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { capture } from "@/shared/lib/posthog";
import { toast } from "sonner";

type Props = {
  url: string;
  shareText: string;
};

export function ShareButtons({ url, shareText }: Props) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success("Link copied to clipboard");
      capture("pool_calc_shared", { channel: "copy" });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Could not copy link");
    }
  }

  function handleWhatsApp() {
    const text = encodeURIComponent(`${shareText} ${url}`);
    window.open(`https://wa.me/?text=${text}`, "_blank", "noopener");
    capture("pool_calc_shared", { channel: "whatsapp" });
  }

  function handleLinkedIn() {
    const u = encodeURIComponent(url);
    window.open(
      `https://www.linkedin.com/sharing/share-offsite/?url=${u}`,
      "_blank",
      "noopener",
    );
    capture("pool_calc_shared", { channel: "linkedin" });
  }

  return (
    <div className="flex flex-wrap gap-2">
      <Button variant="outline" size="sm" onClick={handleCopy}>
        {copied ? (
          <Check className="h-4 w-4 mr-2" />
        ) : (
          <Copy className="h-4 w-4 mr-2" />
        )}
        {copied ? "Copied" : "Copy link"}
      </Button>
      <Button variant="outline" size="sm" onClick={handleWhatsApp}>
        <MessageCircle className="h-4 w-4 mr-2" />
        WhatsApp
      </Button>
      <Button variant="outline" size="sm" onClick={handleLinkedIn}>
        <Linkedin className="h-4 w-4 mr-2" />
        LinkedIn
      </Button>
    </div>
  );
}
