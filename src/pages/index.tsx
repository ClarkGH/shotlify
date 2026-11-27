import { type NextPage } from "next";
import Head from "next/head";

import { AnnounceProvider } from "../workspace/announce";
import Workspace, { TAGLINE } from "../workspace/Workspace";

const Home: NextPage = () => (
  <>
    <Head>
      <title>Shotlify</title>
      <meta name="description" content={TAGLINE} />
      <link rel="icon" href="/favicon.ico" />
    </Head>
    <AnnounceProvider>
      <Workspace />
    </AnnounceProvider>
  </>
);

export default Home;
