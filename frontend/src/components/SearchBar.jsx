import { useState } from "react";

function SearchBar({ onSearch, onClear }) {
  const [query, setQuery] = useState("");

  function handleSubmit(event) {
    event.preventDefault();

    const cleanedQuery = query.trim();

    if (!cleanedQuery) {
      return;
    }

    onSearch(cleanedQuery);
  }

  function handleClear() {
    setQuery("");
    onClear();
  }

  return (
    <form className="search-bar" onSubmit={handleSubmit}>
      <input
        type="text"
        placeholder="Search episodes..."
        value={query}
        onChange={(event) => setQuery(event.target.value)}
      />

      <button type="submit">
        Search
      </button>

      <button type="button" onClick={handleClear}>
        Clear
      </button>
    </form>
  );
}

export default SearchBar;