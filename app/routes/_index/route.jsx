import { redirect } from "@remix-run/node";
import { Form, useLoaderData } from "@remix-run/react";
import { login } from "../../shopify.server";
import styles from "./styles.module.css";

export const loader = async ({ request }) => {
  const url = new URL(request.url);

  if (url.searchParams.get("shop")) {
    throw redirect(`/app?${url.searchParams.toString()}`);
  }

  return { showForm: Boolean(login) };
};

export default function App() {
  const { showForm } = useLoaderData();

  return (
    <div className={styles.index}>
      <div className={styles.content}>
        <h1 className={styles.heading}>EstimaTrack Delivery Rules</h1>
        <p className={styles.text}>
          Dynamic delivery estimates powered by intelligent rules from your database.
        </p>
        {showForm && (
          <Form className={styles.form} method="post" action="/auth/login">
            <label className={styles.label}>
              <span>Shop domain</span>
              <input className={styles.input} type="text" name="shop" />
              <span>e.g: my-shop-domain.myshopify.com</span>
            </label>
            <button className={styles.button} type="submit">
              Log in
            </button>
          </Form>
        )}
        <ul className={styles.list}>
          <li>
            <strong>Database-Driven Rules</strong>. Automatically reads delivery rules from your Supabase database without manual configuration.
          </li>
          <li>
            <strong>Smart Targeting</strong>. Displays estimates based on product ID, SKU, tags, collections, and customer location.
          </li>
          <li>
            <strong>Dynamic Display</strong>. Shows real-time delivery estimates on product pages with seamless integration.
          </li>
        </ul>
      </div>
    </div>
  );
}
