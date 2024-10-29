import React, { useState, useEffect } from "react";
import BlogList from "./BlogList"; // This is your existing component

const BlogListWrapper = () => {
    const titles = ["Story Vault", "Spark Notes", "My Blogs", "Pulse Points"];
    const [currentTitle, setCurrentTitle] = useState(titles[0]);
    let index = 0;

    useEffect(() => {
        const interval = setInterval(() => {
            index = (index + 1) % titles.length;
            setCurrentTitle(titles[index]);
        }, 2000); // change title every 2 seconds

        return () => clearInterval(interval); // cleanup interval on component unmount
    }, []);

    return (
        <div style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            height: "100vh",
            textAlign: "center"
        }}>
            <BlogList /> {/* Renders the original BlogList component */}
            <h1
                style={{
                    fontSize: "2em",
                    fontWeight: "bold",
                    animation: "fadeSlide 2s ease-in-out infinite"
                }}
            >
                {currentTitle}
            </h1>
            <style>
                {`
                    @keyframes fadeSlide {
                        0% { opacity: 0; transform: translateY(-20px); }
                        50% { opacity: 1; transform: translateY(0); }
                        100% { opacity: 0; transform: translateY(20px); }
                    }
                `}
            </style>
        </div>
    );
};

export default BlogListWrapper;
