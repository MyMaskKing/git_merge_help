'use client';

import { ThreeWayDiffViewer } from '@/components/DiffViewer/ThreeWayDiffViewer';

const testData = {
  base: `import React from 'react';

function HelloWorld() {
  return (
    <div>
      <h1>Hello World</h1>
      <p>Welcome to our app!</p>
    </div>
  );
}

export default HelloWorld;`,

  ours: `import React from 'react';

function HelloWorld() {
  return (
    <div className="container">
      <h1 className="title">Hello World</h1>
      <p>Welcome to our awesome app!</p>
      <button>Click me</button>
    </div>
  );
}

export default HelloWorld;`,

  theirs: `import React from 'react';

function HelloWorld() {
  const [count, setCount] = React.useState(0);
  
  return (
    <div>
      <h1>Hello World</h1>
      <p>Welcome to our app!</p>
      <p>Count: {count}</p>
      <button onClick={() => setCount(count + 1)}>
        Increment
      </button>
    </div>
  );
}

export default HelloWorld;`,
};

export default function DiffViewerTestPage() {
  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">三向对比视图测试</h1>
      <div className="h-[calc(100vh-8rem)]">
        <ThreeWayDiffViewer
          baseContent={testData.base}
          oursContent={testData.ours}
          theirsContent={testData.theirs}
          fileName="HelloWorld.tsx"
        />
      </div>
    </div>
  );
} 