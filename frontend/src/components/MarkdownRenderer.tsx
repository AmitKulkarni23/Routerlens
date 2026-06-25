import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import { Box, Typography } from "@mui/material";

interface MarkdownRendererProps {
  content: string;
  showCursor?: boolean;
}

export function MarkdownRenderer({ content, showCursor }: MarkdownRendererProps) {
  // Add cursor to content if streaming
  const contentWithCursor = showCursor ? content + "\n" : content;

  return (
    <Box
      sx={{
        fontFamily: '"Geist Mono", monospace',
        fontSize: "0.875rem",
        lineHeight: 1.7,
        color: "#eae8f0",
        "& p": {
          margin: "0.5em 0",
        },
        "& ul, & ol": {
          margin: "0.5em 0",
          paddingLeft: "1.5em",
        },
        "& li": {
          margin: "0.25em 0",
        },
        "& code:not([class*='language-'])": {
          backgroundColor: "#1a1f2e",
          padding: "0.2em 0.4em",
          borderRadius: "4px",
          fontFamily: '"Geist Mono", monospace',
          color: "#eae8f0",
        },
        "& pre": {
          backgroundColor: "#1a1f2e",
          padding: "1em",
          borderRadius: "8px",
          overflow: "auto",
          margin: "0.5em 0",
        },
        "& blockquote": {
          backgroundColor: "#0d0f13",
          padding: "0.75em 1em",
          borderRadius: "4px",
          margin: "0.5em 0",
          color: "#717486",
        },
        "& a": {
          color: "#5e6ad2",
          textDecoration: "none",
          "&:hover": {
            textDecoration: "underline",
          },
        },
        "& table": {
          borderCollapse: "collapse",
          width: "100%",
          margin: "0.5em 0",
        },
        "& th, & td": {
          border: "1px solid #282d3d",
          padding: "0.5em",
          textAlign: "left",
        },
        "& th": {
          backgroundColor: "#1a1f2e",
          fontWeight: 600,
        },
      }}
    >
      <div>
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            code({ className, children }) {
              const language = className?.replace("language-", "");
              if (language) {
                return (
                  <SyntaxHighlighter
                    language={language}
                    style={oneDark}
                    customStyle={{
                      backgroundColor: "#1a1f2e",
                      padding: "1em",
                      borderRadius: "8px",
                      margin: "0.5em 0",
                      fontFamily: '"Geist Mono", monospace',
                      fontSize: "0.875rem",
                    }}
                  >
                    {String(children).replace(/\n$/, "")}
                  </SyntaxHighlighter>
                );
              }
              return (
                <code
                  style={{
                    backgroundColor: "#1a1f2e",
                    padding: "0.2em 0.4em",
                    borderRadius: "4px",
                    fontFamily: '"Geist Mono", monospace',
                  }}
                >
                  {children}
                </code>
              );
            },
            h1: ({ children }) => (
              <Typography variant="h2" sx={{ marginTop: "1em" }}>
                {children}
              </Typography>
            ),
            h2: ({ children }) => (
              <Typography variant="h3" sx={{ marginTop: "0.8em" }}>
                {children}
              </Typography>
            ),
            h3: ({ children }) => (
              <Typography variant="h4" sx={{ marginTop: "0.6em" }}>
                {children}
              </Typography>
            ),
          }}
        >
          {content}
        </ReactMarkdown>
        {showCursor && <span className="streaming-cursor" />}
      </div>
    </Box>
  );
}
