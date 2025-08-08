import Layout from "@/components/layout/layout";

export default async function IndexLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <Layout>{children}</Layout>;
}