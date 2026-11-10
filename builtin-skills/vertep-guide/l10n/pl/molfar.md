<!-- source: 6b5436de93e1 -->
# Molfar, Twój agent

Molfar to agent AI wbudowany w Molfar Vertep. Wszystko tutaj to zwykłe pliki, a on edytuje te pliki za Ciebie. Przeczytaj tę stronę, jeśli chcesz coś zmienić w swoich aplikacjach i nie chcesz robić tego ręcznie.

## Gdzie mieszka

Otwórz wiersz „Molfar” na stronie głównej. Dostaje on własną kartę, stronę agenta. Pisz w polu i naciśnij Enter, aby wysłać (na telefonie Enter robi nową linię, a wysyła przycisk strzałki). Wpisz `/`, aby zobaczyć polecenia i szablony, albo `@`, aby wskazać plik, postać, księgę wiedzy lub preset, żeby spojrzał dokładnie na ten.

Przy otwartej aplikacji „Podziel” umieszcza Molfara po lewej, a aplikację na żywo po prawej, więc patrzysz, jak się zmienia, gdy pytasz. Na telefonie jest po prostu kolejną kartą.

## Co potrafi

- Zmieniać aplikację: jej ekrany, zachowanie, kolory, układ.
- Tworzyć nową aplikację ze szablonu, a potem rozbudowywać ją z Tobą.
- Edytować dane wewnątrz aplikacji, na przykład karty postaci i księgi wiedzy, nawet bardzo duże.
- Dodawać wtyczki i zmieniać motywy.
- Generować obrazy modelami obrazów, które skonfigurowałeś.
- Prowadzić notatki oraz proponować wpisy pamięci i umiejętności.
- Jeśli jesteś administratorem, pomagać z kontami i ustawieniami serwera. Każda taka zmiana czeka na Twoją zgodę.

Najpierw patrzy, zanim zmieni, pracuje małymi krokami, sprawdza swoją pracę i kończy krótkim raportem, co się zmieniło i jak to cofnąć.

## O co pyta najpierw

- **Duże lub niejasne prośby.** Przy nowej aplikacji lub dużej funkcji najpierw zadaje kilka pytań z opcjami.
- **Chronione pliki.** Domyślnie pliki źródłowe aplikacji i jej główna strona są chronione, tak samo jak jego własne stałe instrukcje i plik parametrów modelu. Karta pyta „Zezwól” lub „Nie zezwalaj”, a odpowiedź obejmuje tylko tę jedną prośbę. Listę edytujesz w Ustawieniach, Molfar.
- **Koszt.** Przed dużym zadaniem, płatnym generowaniem testowym lub płatnym obrazem pokazuje szacunek i czeka na Twoje „tak”. Zmień to w Ustawieniach, Molfar, Kontrola kosztów.
- **Polecenia powłoki.** Zależnie od trybu, poniżej.

## Tryb

Selektor trybu w nagłówku decyduje, co może robić bez pytania:

- **Pełny** najpierw planuje duże zmiany, potem edytuje i uruchamia polecenia.
- **Akceptuj** pomija krok planu i pyta przed każdym poleceniem powłoki.
- **Plan** tylko czyta i planuje, niczego nie zmienia. Po planie „Zastosuj propozycję” opuszcza tryb i wykonuje go.

## Jak cofnąć

Pod odpowiedzią, która zmieniła aplikację, widzisz „Zmieniono <aplikacja> · plików: N · Cofnij”. Cofnij najpierw pyta, a potem przywraca kod aplikacji do stanu sprzed tego przebiegu. Twoje czaty i przesłane pliki zostają. Strona projektu aplikacji ma też Punkty kontrolne: zapisane punkty kodu aplikacji, które Molfar robi, zanim zmieni aplikację. Możesz dodawać własne przyciskiem „Zapisz punkt kontrolny”, a Przywróć najpierw pyta. Każde przywrócenie samo jest zapisywane, więc można je cofnąć.

## Pamięć i umiejętności

Przycisk mózgu otwiera „Pamięć i umiejętności”. Pamięć trzyma to, co zachowuje między czatami; proponuje wpisy i zapisuje je tylko za Twoją zgodą. Umiejętności to krótkie instrukcje do jednego rodzaju zadania; „Nowa umiejętność” pisze jedną, a „Ulepsz z Molfarem” dopracowuje ją. Zobacz [[projects-and-chats]], aby poznać te specyficzne dla projektu.

### Skrzynka

Karta proponująca wpis pamięci albo umiejętność ma trzy odpowiedzi: „Save”, „Later” i „Skip”. „Later” zostawia propozycję w zakładce „Mailbox” w „Pamięć i umiejętności”, tak samo jak karta, na którą nikt nie odpowiedział, i podpowiedź, którą Molfar daje po długim zadaniu. Liczba na przycisku mózgu pokazuje, ile czeka; gdy coś czeka, przycisk otwiera się na zakładce „Mailbox”.

- Wpis pamięci można edytować przed zapisem. Umiejętność jest pokazana w całości, albo jako diff, gdy zmienia umiejętność, którą już masz, i jest zapisywana tak, jak ją widzisz. Aby ją zmienić, pomiń ją i powiedz Molfarowi, co poprawić.
- „Skip” jest zapamiętywane, więc Molfar nie przynosi tej samej propozycji ponownie. „Skip all” czyści listę.
- Czat, który skończył się, gdy byłeś w innym czacie, też czeka w zakładce „Mailbox”, z „Open” i „Dismiss”. Lista czatów oznacza go tak samo.

## Dobrze wiedzieć

- Małe lub darmowe modele: „Tryb małego modelu” w Ustawieniach, Molfar wysyła krótszy prompt.
- Przycisk oka, inspektor promptów, pokazuje, co naprawdę wysłano do modelu.
- Długie czaty można zwinąć w podsumowanie przez „Kompaktuj rozmowę” lub `/compact`.
- Słowa użyte tutaj są wyjaśnione w [[glossary]].
