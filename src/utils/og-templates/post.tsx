import satori from "satori";
import type { CollectionEntry } from "astro:content";
import loadGoogleFonts, { type FontOptions } from "../loadGoogleFont";

export default async (post: CollectionEntry<"blog">) => {
  const dateStr = post.data.pubDatetime.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  return satori(
    <div
      style={{
        background: "#fefbfb",
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: "-1px",
          right: "-1px",
          border: "4px solid #000",
          background: "#ecebeb",
          opacity: "0.9",
          borderRadius: "4px",
          display: "flex",
          justifyContent: "center",
          margin: "2.5rem",
          width: "88%",
          height: "80%",
        }}
      />

      <div
        style={{
          border: "4px solid #000",
          background: "#fefbfb",
          borderRadius: "4px",
          display: "flex",
          justifyContent: "center",
          margin: "2rem",
          width: "88%",
          height: "80%",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            margin: "20px",
            width: "90%",
            height: "90%",
          }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              maxHeight: "80%",
            }}
          >
            <p
              style={{
                fontSize: 60,
                fontWeight: "bold",
                lineHeight: 1.2,
                marginBottom: 16,
              }}
            >
              {post.data.title}
            </p>
            <p
              style={{
                fontSize: 28,
                color: "#555",
                lineHeight: 1.4,
              }}
            >
              {post.data.description}
            </p>
          </div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              width: "100%",
              marginBottom: "8px",
              fontSize: 28,
            }}
          >
            <span style={{ fontWeight: "bold" }}>
              by {post.data.author}
            </span>

            <span style={{ color: "#666" }}>{dateStr}</span>
          </div>
        </div>
      </div>
    </div>,
    {
      width: 1200,
      height: 630,
      embedFont: true,
      fonts: (await loadGoogleFonts(
        post.data.title + post.data.description + post.data.author + dateStr + "by"
      )) as FontOptions[],
    }
  );
};
