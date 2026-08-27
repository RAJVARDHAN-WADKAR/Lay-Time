const fs = require('fs');
const path = require('path');

const dashPath = path.join(process.cwd(), 'app/dashboard/page.tsx');
let content = fs.readFileSync(dashPath, 'utf8');

// Ensure isMounted check before rendering Recharts charts
if (!content.includes('const [isMounted, setIsMounted] = useState(false);')) {
  content = content.replace(
    'const [isLoading, setIsLoading] = useState(true);',
    'const [isLoading, setIsLoading] = useState(true);\n  const [isMounted, setIsMounted] = useState(false);\n\n  useEffect(() => {\n    setIsMounted(true);\n  }, []);'
  );

  // Wrap Recharts containers with isMounted check
  content = content.replace(
    '<div className="h-64 w-full">',
    '<div className="h-64 w-full">{isMounted && ('
  );
  content = content.replace(
    '</ResponsiveContainer>\n            </div>',
    '</ResponsiveContainer>)}</div>'
  );

  fs.writeFileSync(dashPath, content, 'utf8');
  console.log('Updated app/dashboard/page.tsx with isMounted check for Recharts');
}
