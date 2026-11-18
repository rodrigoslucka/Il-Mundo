Deno.serve(async () => Response.json(
  { error: "El envío de balances por correo está desactivado." },
  { status: 410 },
));
