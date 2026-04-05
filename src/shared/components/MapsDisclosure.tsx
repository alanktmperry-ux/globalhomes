const MapsDisclosure = () => (
  <div className="w-full bg-slate-50 border-t border-slate-200 py-2 px-6">
    <p className="text-xs text-slate-500 text-center">
      This site uses Google Maps for property search and address suggestions.
      Location data is sent to Google.{' '}
      <a href="/privacy" className="text-blue-500 hover:underline">
        Privacy Policy
      </a>
    </p>
  </div>
);

export default MapsDisclosure;
