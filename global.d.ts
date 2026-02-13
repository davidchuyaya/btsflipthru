import "react";

declare module "react" {
    namespace JSX {
        interface IntrinsicElements {
            "hover-tilt": React.DetailedHTMLProps<
                React.HTMLAttributes<HTMLElement>,
                HTMLElement
            > & {
                "tilt-factor"?: string | number;
                "scale-factor"?: string | number;
            };
        }
    }
}

declare global {
    namespace NodeJS {
        interface ProcessEnv {
            NEXTJS_ENV: "development" | "production" | "test";
            BETTER_AUTH_SECRET: string;
            BETTER_AUTH_URL: string;
            GOOGLE_CLIENT_SECRET: string;
            GOOGLE_CLIENT_ID: string;
            TURNSTILE_SECRET_KEY: string;
            CLOUDINARY_API_SECRET: string;
            DATABASE_URL: string;
        }
    }
}
