const fs = require('fs');
const path = require('path');

const css = `@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --background: 210 40% 98%;
    --foreground: 222.2 84% 4.9%;

    --card: 0 0% 100%;
    --card-foreground: 222.2 84% 4.9%;

    --popover: 0 0% 100%;
    --popover-foreground: 222.2 84% 4.9%;

    --primary: 217.2 91.2% 45%;
    --primary-foreground: 210 40% 98%;

    --secondary: 210 40% 96.1%;
    --secondary-foreground: 222.2 47.4% 11.2%;

    --muted: 210 40% 96.1%;
    --muted-foreground: 215.4 16.3% 46.9%;

    --accent: 210 40% 94%;
    --accent-foreground: 222.2 47.4% 11.2%;

    --destructive: 0 84.2% 60.2%;
    --destructive-foreground: 210 40% 98%;

    --border: 214.3 31.8% 91.4%;
    --input: 214.3 31.8% 91.4%;
    --ring: 221.2 83.2% 53.3%;

    --radius: 0.625rem;
  }
}

@layer base {
  * {
    @apply border-border;
  }
  body {
    @apply bg-slate-950/2 text-slate-900 antialiased selection:bg-blue-600 selection:text-white font-sans;
    background-color: #f8fafc;
    background-image: 
      radial-gradient(at 0% 0%, rgba(2, 132, 199, 0.03) 0px, transparent 50%),
      radial-gradient(at 100% 100%, rgba(15, 23, 42, 0.03) 0px, transparent 50%);
    background-attachment: fixed;
  }
}

/* Custom Maritime Card Glass Effect */
.glass-panel {
  background: rgba(255, 255, 255, 0.85);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid rgba(226, 232, 240, 0.8);
}

.glass-dark {
  background: rgba(15, 23, 42, 0.85);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid rgba(51, 65, 85, 0.6);
}

/* Pulse indicator animation */
@keyframes pulse-subtle {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.6; transform: scale(0.95); }
}

.animate-pulse-subtle {
  animation: pulse-subtle 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}

/* Custom scrollbars */
::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}
::-webkit-scrollbar-track {
  background: transparent;
}
::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 4px;
}
::-webkit-scrollbar-thumb:hover {
  background: #94a3b8;
}
`;

fs.writeFileSync(path.join(process.cwd(), 'app/globals.css'), css, 'utf8');
console.log('Updated app/globals.css');
