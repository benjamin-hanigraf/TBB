-- ============ Part 7: studio address and two home page photos ============
-- The address is written the same way everywhere, with this line break.
update settings set value = jsonb_set(value, '{address}', to_jsonb(E'2nd Floor, Berachah Building, 13/7, 1st Cross St,\nTrustpuram, Kodambakkam, Chennai - 600024.'::text)) where key = 'business';
-- The group photo is now the main photo, and the calligraphy photo sits in the writing classes band.
update site_images set path = '/img/31648a2db3.webp', alt = 'A workshop group outside the studio holding up their paintings' where key = 'hero';
update site_images set path = '/img/cb028c51a9.webp', alt = 'Hands practising modern calligraphy' where key = 'classes_banner';
