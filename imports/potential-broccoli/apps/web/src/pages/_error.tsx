import { NextPageContext } from 'next';

interface ErrorProps {
  statusCode?: number;
  hasGetInitialProps?: boolean;
  title?: string;
}

function Error({ statusCode }: ErrorProps) {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-4">
      <h1 className="text-5xl font-bold mb-2">
        {statusCode ? statusCode : 'Client-side error occurred'}
      </h1>
      <p className="text-muted-foreground mb-6">
        {statusCode === 404
          ? "Sorry, we couldn't find that page."
          : 'An error occurred on the server.'}
      </p>
      <a 
        className="px-4 py-2 rounded-md bg-primary text-primary-foreground hover:bg-primary/90" 
        href="/"
      >
        Go home
      </a>
    </div>
  );
}

Error.getInitialProps = ({ res, err }: NextPageContext) => {
  const statusCode = res ? res.statusCode : err ? err.statusCode : 404;
  return { statusCode };
};

export default Error;
