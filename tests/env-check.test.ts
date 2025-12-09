test("env variables load correctly", () => {
    console.log("SUPABASE URL:", process.env.NEXT_PUBLIC_SUPABASE_URL);
    expect(process.env.NEXT_PUBLIC_SUPABASE_URL).toBeDefined();
  });
  