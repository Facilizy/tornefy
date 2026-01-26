do $do$
begin
  if not exists (select 1 from public.educational_popups where kind = 'welcome') then
    insert into public.educational_popups (
      kind, active, title, description, cta_label, svg_markup, audience
    ) values (
      'welcome',
      true,
      'Bem-vindo(a) à Tornefy',
      'Bora evoluir no competitivo — organize seus treinos, garanta seu slot e acompanhe seu ranking.',
      'Começar',
      $svg$<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 500"><g id="freepik--Shadow--inject-114"><ellipse cx="250" cy="414.97" rx="208.19" ry="25.7" style="fill:#ebebeb"></ellipse></g><g id="freepik--Desk--inject-114"><polygon points="47.44 372.76 98.08 372.51 148.72 372.43 250 372.26 351.28 372.42 401.92 372.51 452.56 372.76 401.92 373 351.28 373.09 250 373.26 148.72 373.09 98.08 373 47.44 372.76" style="fill:#263238"></polygon></g><g id="freepik--Chair--inject-114"><path d="M47.73,372.74a469.1,469.1,0,0,0-.57-50.69c-2.47-40.33-7.73-93.6-2.85-104.79,3.38-7.78,16.49-18.43,17.62-20.42,2.23-3.9,9.78-26.37,13.43-31,6.16-7.79,34-7.62,38.47-2,8.25,10.59,9.92,29.14,13.23,32.73s28.11,13.29,31.46,22.47S147.86,249,147.68,254.66s26.58,69.22,27.49,83.32-13.12,34.4-13.12,34.4Z" style="fill:#a6a6a6"></path></g></svg>$svg$,
      'authenticated'
    );
  end if;
end
$do$;