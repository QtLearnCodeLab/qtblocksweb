import Head from 'next/head';
import MainLayout from "../components/MainLayout";
import Workspace from "../components/Workspace";

export default function MainContent() {
  return (
    <MainLayout>
      <Head>
        <title>QtPi Low Code Platform</title>
        <link rel="icon" type="image/png" href="/media/favicon-qtpi.png" />
      </Head>
      <Workspace />
    </MainLayout>
  );
}
