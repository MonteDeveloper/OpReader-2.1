import { Box } from '@mui/material'

function MobileContainer({children}) {

  return (
    <Box maxWidth={'767px'} bgcolor={'#16192a'} height={'100dvh'} margin={'0 auto'}>
      <>
        {children}
      </>
    </Box>
  )
}

export default MobileContainer
