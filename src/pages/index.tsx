import { type NextPage } from "next";
import Head from "next/head";
// import Link from "next/link";

// import { api } from "../utils/api";

const Home: NextPage = () => {
  // const hello = api.example.hello.useQuery({ text: "from tRPC" });

  return (
    <>
      <Head>
        <title>Shotlify</title>
        <meta name="description" content="Take screenshots and create a slideshow with your own custom videos!" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <header className="flex min-h-screen flex-col items-center bg-[#A0AECD]">
        <h1 className="text-black text-6xl mt-12">Shotlify</h1>
      </header>
      <main>

      </main>
    </>
  );
};

export default Home;
