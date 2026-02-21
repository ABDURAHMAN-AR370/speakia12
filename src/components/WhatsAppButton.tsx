import { MessageCircle } from "lucide-react";

const ADMIN_WHATSAPP = "917593879279";

export default function WhatsAppButton() {
  const handleClick = () => {
    window.open(
      `https://wa.me/${ADMIN_WHATSAPP}?text=${encodeURIComponent("Hi, I need help with Qurba course.")}`,
      "_blank"
    );
  };

  return (
    <button
      onClick={handleClick}
      className="fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full bg-[hsl(142,70%,45%)] hover:bg-[hsl(142,70%,40%)] text-white shadow-lg flex items-center justify-center transition-transform hover:scale-110"
      title="Contact us on WhatsApp"
    >
      <MessageCircle className="h-7 w-7" />
    </button>
  );
}
