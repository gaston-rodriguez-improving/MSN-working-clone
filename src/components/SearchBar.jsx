const SearchBar = ({ value, onChange, placeholder }) => (
  <input
    className="p-1.5 border rounded-[4px] w-full searchbar bg-transparent text-[#6b8fa3] placeholder:text-[#6b8fa3]"
    type="search"
    aria-label="Search your contacts"
    placeholder={placeholder}
    value={value}
    onChange={(event) => onChange(event.target.value)}
  />
);

export default SearchBar;
