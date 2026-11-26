<!-- source: 9d4c677df24e -->
# Aplikacje

Jak znajdować, dodawać, aktualizować i usuwać aplikacje. Aplikacje to rzeczy, których faktycznie używasz: Roleplay jest tą główną.

## Strona główna

Nowa karta (+) otwiera stronę główną „Dokąd?”. Znajdują się na niej Molfar i Twoje zainstalowane aplikacje. Na komputerze kliknij aplikację, aby zobaczyć, co jest w środku, i naciśnij „Otwórz”; szczegóły zawierają też „Eksportuj aplikację”, a dla aplikacji, które mają źródło aktualizacji, „Sprawdź aktualizacje”. Na telefonie dotknięcie otwiera ją od razu, a przycisk (i) pokazuje szczegóły. Ikona kosza usuwa aplikację po potwierdzeniu, co trwale usuwa jej dane.

Każda otwarta aplikacja ma własną kartę. Karty można przeciągać w dowolnej kolejności i wracają po odświeżeniu.

## Gdy aplikacja jest otwarta

Pasek narzędzi oferuje:

- „Podziel”: Molfar po lewej, aplikacja na żywo po prawej.
- „Pełny ekran”: aplikacja we własnej karcie przeglądarki, którą możesz zainstalować jak aplikację.
- „Wtyczki”: wtyczki aplikacji i ich uprawnienia; importuj więcej z gita.
- „Przebuduj”: natychmiast przebudowuje aplikację. Gdy trwa budowanie, przycisk zmienia się w „Budowanie…” z zegarem (na przykład 1:23) i nie można go nacisnąć ponownie; nad aplikacją pojawia się cienka linia mówiąca, co jest budowane („Pakowanie pakietów…” lub „Budowanie kodu aplikacji…”), z tym samym zegarem. Pierwsze budowanie może potrwać kilka minut, na telefonie dłużej: nie zamykaj strony.

Na telefonie te trzy znajdują się w menu konta, a pozycja „Przebuduj” pokazuje ten sam zegar „Budowanie…”.

Po aktualizacji aplikacji jest ona budowana ponownie przy następnym otwarciu, ale tylko zmienione pliki (a pakiety tylko wtedy, gdy się zmieniły), więc zwykle jest to szybkie. Ustawienia > Programista pokazuje każdą aplikację i jej budowę: „Zbudowana i aktualna”, „Zbudowana wcześniej. Zbuduje się ponownie przy otwarciu”, „Jeszcze nie zbudowana. Zbuduje się przy otwarciu”, „Budowanie nie powiodło się” albo „Budowanie…” z zegarem, dopóki trwa budowanie.

## Gdy aplikacja chce czytać inną aplikację

Aplikacja może poprosić o odczyt plików innej aplikacji, na przykład Social czytający Twoje postacie z Roleplay. Za pierwszym otwarciem takiej aplikacji pojawia się pytanie: „Zezwolić aplikacji <app> na odczyt danych <other app>?”, z informacją, do czego to służy, i dokładnymi plikami. „Zezwól” lub „Nie zezwalaj” to odpowiedzi; „Zdecyduję później” pyta ponownie następnym razem. Dostęp jest tylko do odczytu: aplikacja nie może niczego zmienić ani usunąć w drugiej aplikacji i widzi tylko wymienione pliki. Odpowiedź możesz zmienić w dowolnym momencie: na stronie głównej otwórz szczegóły aplikacji i zajrzyj do „Dostęp do innych aplikacji”. Jeśli aktualizacja aplikacji prosi o więcej plików, zapytamy ponownie. Usunięcie którejkolwiek z aplikacji zapomina odpowiedź.

## Wiadomości z aplikacji

Oficjalna aplikacja, na przykład Social, może powiedzieć Molfar Vertep, że coś na Ciebie czeka. Na karcie aplikacji pojawia się mała liczba, a gdy przyjdzie coś nowego, widzisz krótką wiadomość: wyskakujące okienko w prawym dolnym rogu, gdy jesteś w Molfar Vertep i patrzysz na coś innego, albo powiadomienie systemowe, gdy okno nie jest na wierzchu (przeglądarka pyta o zgodę raz; przełącznik powiadomień systemowych jest w Ustawieniach). Nic nie jest pokazywane, gdy patrzysz na samą aplikację. Aby to wyłączyć dla jednej aplikacji, otwórz jej szczegóły na stronie głównej i odznacz "Powiadomienia z tej aplikacji"; liczba też zniknie. Kliknięcie wyskakującego okienka otwiera aplikację.

## Store

„Store” na stronie głównej pokazuje aplikacje od Molfar Vertep (oznaczone „Oficjalna aplikacja”) i od społeczności. Naciśnij „Zainstaluj”: najpierw zobaczysz, co aplikacja zawiera i do czego może sięgać, a nic nie zostanie uruchomione, dopóki nie potwierdzisz. Instaluj tylko to, czemu ufasz, ponieważ aplikacje uruchamiają prawdziwy kod na Twoim komputerze. „Odśwież” pyta o nowe aplikacje, a plakietka zlicza te dodane od Twojego ostatniego spojrzenia.

## Nowe i importowane aplikacje

- „Nowa aplikacja”: nadaj jej nazwę (autor jest opcjonalny), a otrzymasz szablon, który Molfar rozbudowuje razem z Tobą.
- „Importuj aplikację”: z repozytorium git lub z pliku kopii zapasowej utworzonego przez „Eksportuj aplikację”. Najpierw jest sprawdzana i nic nie jest uruchamiane, dopóki nie przeczytasz, co zawiera, i nie potwierdzisz.

## Aktualizacje

Ikona pobierania na górnym pasku dostaje kropkę, gdy coś czeka. Wyświetla wszystkie aplikacje i ma „Sprawdź teraz”. Aplikacja bez źródła aktualizacji pokazuje „Brak źródła aktualizacji” i krótki powód. Aplikacji zainstalowanej z pliku (zip) nie można tu zaktualizować: aby dostawać aktualizacje, zainstaluj ją ze Store; ta kopia jest osobną aplikacją, więc najpierw wyeksportuj plik, jeśli zawiera dane, które chcesz zachować (ikona kosza usuwa aplikację i jej dane). Aplikacja utworzona na tym urządzeniu (na przykład przez Molfar) albo skopiowana ręcznie nie ma w ogóle źródła, z którego mogłaby się aktualizować. Instalacja aplikacji, której zakres `engine` wskazuje kontrakt aplikacji, jakiego ten silnik nie ma (liczy się też numer wersji Molfar Vertep wpisany tam przez pomyłkę), jest odrzucana z komunikatem; wiersz silnika w oknie aktualizacji wymienia zainstalowane aplikacje, które już nie pasują. „Aktualizuj wszystko” pojawia się, gdy czekają dwie lub więcej aplikacji, i nigdy nie obejmuje samego Molfar Vertep.

Twoje własne zmiany są scalane z aktualizacją, a Twoje dane są zachowywane. Tam, gdzie Twoje zmiany nakładają się na nową wersję, nic się jeszcze nie zmienia: wybierasz „Zachowaj moją”, „Przyjmij aktualizację” lub „Poproś Molfara o scalenie”. Aktualizacja, która instaluje nowe pakiety lub prosi o nowe uprawnienia, czeka na Twoją zgodę.

## Gdzie są ustawienia aplikacji

Własne ustawienia aplikacji znajdują się wewnątrz aplikacji. Ustawienia powłoki zawierają to, co wspólne dla wszystkich aplikacji: modele, mowę, obrazy, pamięć, serwery MCP. Zobacz [[settings]].

## Gdy aplikacja zawodzi

Gdy budowanie aplikacji kończy się niepowodzeniem, zachowuje ona ostatnią dobrą wersję, a jej pasek błędu oferuje „Zapytaj Molfara”, co wysyła mu problem na nowym czacie. Zobacz [[help-and-bugs]].
