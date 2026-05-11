import { useTheme } from "next-themes";
import { Toaster as Sonner, toast } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast bg-white text-[#0a0f1e] border border-[#E5E7EB] rounded-[12px] shadow-lg",
          description: "text-[#6B7280]",
          actionButton: "bg-[#2563EB] text-white rounded-[10px] font-semibold",
          cancelButton: "bg-white border border-[#E5E7EB] text-[#374151] rounded-[10px]",
          success: "border-[#34D399]/30",
          error: "border-[#F87171]/30",
          info: "border-[#2563EB]/30",
          warning: "border-[#F59E0B]/30",
        },
      }}
      {...props}
    />
  );
};

export { Toaster, toast };
